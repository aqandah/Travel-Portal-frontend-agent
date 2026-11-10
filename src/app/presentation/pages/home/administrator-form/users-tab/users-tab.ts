import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateUserRequest, SelectMenuRecord, UpdateUserRequest, ViewUser } from '../../../../../data/models';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OfficeRepository } from '../../../../../domain/office';
import { UserRepository } from '../../../../../domain/user';
import { FormTextInput } from '../../../../components/form-text-input';
import { DialogService } from '../../../../../core/services/dialog';
import { CommonModule } from '@angular/common';
import { AppService } from '../../../../../core/services/app';
import { arabicOnlyValidator, englishOnlyValidator } from '../../../../../core/validators/language';

@Component({
  selector: 'app-users-tab',
  imports: [CommonModule, ReactiveFormsModule, FormTextInput],
  templateUrl: './users-tab.html',
})
export class UsersTab {
  userRepository = inject(UserRepository);
  dialogService = inject(DialogService);
  officeRepo = inject(OfficeRepository)
  appService = inject(AppService);

  backToAdministrator(): void {
    this.appService.selectedTabIndex.set(6);
  }
  fb = inject(FormBuilder);

  private destroyRef = inject(DestroyRef);

  selectedUserCode: string | null = null;
  filteredUsers = signal<ViewUser[]>([]);
  showUserModal = false;
  searchControl = new FormControl('');
  isEditMode = false;
  userForm: FormGroup;
  offices: SelectMenuRecord[] = []
  users = signal<ViewUser[]>([]);

  itemsPerPage = 12;
  currentPage = 1;

  get totalPages(): number {
    return Math.ceil(this.filteredUsers().length / this.itemsPerPage) || 1;
  }

  get paginatedUsers(): ViewUser[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers().slice(start, start + this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else if (this.currentPage <= 3) {
      for (let i = 1; i <= 5; i++) pages.push(i);
    } else if (this.currentPage >= this.totalPages - 2) {
      for (let i = this.totalPages - 4; i <= this.totalPages; i++) pages.push(i);
    } else {
      for (let i = this.currentPage - 2; i <= this.currentPage + 2; i++) pages.push(i);
    }
    return pages;
  }

  userTypeOptions = [
    { label: 'Normal User', value: 1 },
    { label: 'Admin User', value: 2 },

    // { label: 'Company Admin', value: 3 },
    // { label: 'Query User', value: 3 },
    // { label: 'Agencies Query', value: 5 },
  ];

  userTypeDescriptions: Record<number, string> = {
    1: 'User for the offices who issue policies and can see only his office policies.',
    2: 'Administrator who can see all issued policies for all offices and agencies.',
    3: 'Can see all issued policies for all offices and agencies with no access to the policies.',
    4: 'For agencies with more than one office; can see all issued policies by these offices with no access to the policies.',
    5: 'Can see all issued policies for all agencies and brokers with no access to the policies.',
  };

  constructor() {
    this.userForm = this.fb.group({
      userCode: ['', Validators.required],
      userNameEng: ['', [Validators.required, englishOnlyValidator()]],
      userNameNative: ['', arabicOnlyValidator()],
      userType: [1, Validators.required],
      officeId: ['', Validators.required],
      userPassword: ['', Validators.required],
      userEmail: [''],
      userPhone: [''],
      userCashAccount: ['', Validators.required],
      activeStatus: [1],
    });

    this.searchControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.filterUsers(value || '');
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
    await this.loadOffices();
  }

  async loadOffices(): Promise<void> {
    this.appService.isLoading.set('Loading offices...');

    this.offices = await this.officeRepo.GetOfficesAsRecords();
    this.appService.isLoading.set(null)
  }

  async loadUsers(): Promise<void> {
    this.appService.isLoading.set('Loading users...');

    try {
      const response = await this.userRepository.getUsers();
      this.users.set(response);
      this.filteredUsers.set(response);
      this.currentPage = 1;
      this.appService.isLoading.set(null);
    } catch (error) {
      this.dialogService.openDialog('Error loading users', 'error');
      this.appService.isLoading.set(null);
    }
  }

  filterUsers(searchValue: string): void {
    if (!searchValue) {
      this.filteredUsers.set(this.users());
    } else {
      const filtered = this.users().filter(u =>
        u.userCode?.toLowerCase().includes(searchValue.toLowerCase()) ||
        u.nameInEnglish?.toLowerCase().includes(searchValue.toLowerCase())
      );
      this.filteredUsers.set(filtered);
    }
    this.currentPage = 1;
  }

  selectUser(code: string): void {
    this.selectedUserCode = code;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  previousPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  openAddUserModal(): void {
    this.isEditMode = false;
    this.userForm.reset({
      userCode: '',
      userNameEng: '',
      userNameNative: '',
      userType: 1,
      officeId: '',
      userPassword: '',
      userEmail: '',
      userPhone: '',
      userCashAccount: '',
      activeStatus: 1,
    });

    this.userForm.get('userCode')?.enable();
    this.userForm.get('userPassword')?.setValidators(Validators.required);
    this.userForm.get('userPassword')?.updateValueAndValidity();
    this.showUserModal = true;
  }

  openEditUserModal(): void {
    if (!this.selectedUserCode) return;

    const user = this.users().find(u => u.userCode === this.selectedUserCode);
    if (!user) return;

    this.isEditMode = true;
    this.userForm.patchValue({
      userCode: user.userCode,
      userNameEng: user.nameInEnglish,
      userNameNative: user.nameInArabic,
      userType: user.userType ?? 1,
      officeId: user.officeId,
      userPassword: '',
      userEmail: user.userEmail,
      userPhone: user.userPhone,
      userCashAccount: user.userCashAccount,
      activeStatus: 1,
    });

    this.userForm.get('userCode')?.disable();
    this.userForm.get('userPassword')?.clearValidators();
    this.userForm.get('userPassword')?.updateValueAndValidity();
    this.userForm.get('userCashAccount')?.clearValidators();
    this.userForm.get('userCashAccount')?.updateValueAndValidity();
    this.showUserModal = true;
  }

  closeModal(): void {
    this.showUserModal = false;
    this.userForm.reset();
  }

  getUserTypeBadgeClass(type: number | null | undefined): string {
    switch (type) {
      case 1: return 'bg-secondary';
      case 2: return 'bg-danger';
      case 3: return 'bg-info';
      case 4: return 'bg-warning text-dark';
      case 5: return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  getUserTypeLabel(type: number | null | undefined): string {
    switch (type) {
      case 1: return 'Normal User';
      case 2: return 'Admin User';
      case 3: return 'Query User';
      case 4: return 'Company Admin';
      case 5: return 'Agencies Query';
      default: return 'Unknown';
    }
  }

  getUserTypeDescription(type: number | null | undefined): string {
    return this.userTypeDescriptions[type ?? 0] ?? '';
  }

  async saveUser(): Promise<void> {
    if (this.userForm.invalid) {
      this.dialogService.openDialog('Please fill in all required fields', 'error');
      Object.keys(this.userForm.controls).forEach(key => {
        this.userForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.userForm.getRawValue();
    this.appService.isLoading.set(this.isEditMode ? 'Updating user...' : 'Creating user...');

    try {
      if (this.isEditMode) {
        const updateData: UpdateUserRequest = {
          userNameEng: formValue.userNameEng,
          userNameNative: formValue.userNameNative || undefined,
          userType: formValue.userType,
          officeId: formValue.officeId,
          userPassword: formValue.userPassword || undefined,
          userEmail: formValue.userEmail || undefined,
          userPhone: formValue.userPhone || undefined,
          userCashAccount: formValue.userCashAccount || undefined,
        };
        await this.userRepository.updateUserAsync(updateData, formValue.userCode);
        this.dialogService.openDialog('User updated successfully', 'success');
      } else {
        const createData: CreateUserRequest = {
          userCode: formValue.userCode,
          userNameEng: formValue.userNameEng,
          userNameNative: formValue.userNameNative || undefined,
          userType: formValue.userType,
          officeId: formValue.officeId,
          userPassword: formValue.userPassword,
          userEmail: formValue.userEmail || undefined,
          userPhone: formValue.userPhone || undefined,
          userCashAccount: formValue.userCashAccount || undefined,
          activeStatus: formValue.activeStatus,
        };
        await this.userRepository.addUser(createData);
        this.dialogService.openDialog('User created successfully', 'success');
      }
      this.appService.isLoading.set(null);

      this.closeModal();
      await this.loadUsers();
    } catch (error) {
      this.dialogService.openDialog('Error saving user', 'error');
    } finally {
      this.appService.isLoading.set(null);
    }
  }

  get isSelectedUserLocked(): boolean {
    if (!this.selectedUserCode) return false;
    const user = this.users().find(u => u.userCode === this.selectedUserCode);
    return user?.isLocked === true;
  }

  async lockUnlockUser(): Promise<void> {
    if (!this.selectedUserCode) return;

    const action = this.isSelectedUserLocked ? 'Unlocking' : 'Locking';
    this.appService.isLoading.set(`${action} user...`);

    try {
      await this.userRepository.lockUnlockUser(this.selectedUserCode);
      this.dialogService.openDialog(`User ${action.toLowerCase().replace('ing', 'ed')} successfully`, 'success');
      await this.loadUsers();
    } catch (error) {
      this.dialogService.openDialog(`Error ${action.toLowerCase()} user`, 'error');
    } finally {
      this.appService.isLoading.set(null);
    }
  }

  async deleteUser(): Promise<void> {
    if (!this.selectedUserCode) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Delete user?',
      message: `User ${this.selectedUserCode} will be permanently deleted.`,
      confirmText: 'Delete user',
      tone: 'danger',
    });
    if (!confirmed) return;

    this.appService.isLoading.set('Deleting user...');

    try {
      await this.userRepository.deleteUser(this.selectedUserCode);
      this.dialogService.openDialog('User deleted successfully', 'success');
      this.selectedUserCode = null;
      await this.loadUsers();
    } catch (error) {
      this.dialogService.openDialog('Error deleting user', 'error');
    } finally {
      this.appService.isLoading.set(null);
    }
  }
}
